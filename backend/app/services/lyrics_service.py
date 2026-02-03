"""
Lyrics Extraction Service

Provides AI-powered lyrics extraction and ChordPro generation.
Uses Claude to analyze song information and generate chord charts.
"""
import re
from typing import Optional
from dataclasses import dataclass

from app.services.ai_service import ai_service


@dataclass
class LyricsExtractionResult:
    """Result of lyrics extraction."""
    title: str
    artist: Optional[str]
    key: Optional[str]
    chordpro_content: str
    sections: list[dict]  # List of {type, lyrics, chords}
    confidence: int  # 0-100
    source: str  # "ai", "youtube", "search"


LYRICS_EXTRACTION_PROMPT = """당신은 한국 CCM과 찬양 전문가입니다.
주어진 곡 정보를 바탕으로 ChordPro 포맷의 코드차트를 생성해주세요.

곡 정보:
- 제목: {title}
- 아티스트: {artist}
- 키: {key}

ChordPro 포맷 예시:
```
{{title: 곡 제목}}
{{artist: 아티스트}}
{{key: G}}

{{comment: Verse 1}}
[G]가사 첫 줄 [D]여기에
[Em]두 번째 줄 [C]가사

{{comment: Chorus}}
[G]후렴 가사 [D]코드와 함께
```

요구사항:
1. 한국어 가사를 포함해주세요 (알려진 경우)
2. 영어 원곡 가사도 함께 포함해주세요 (번안곡인 경우)
3. 주요 코드 진행을 정확하게 표시해주세요
4. Verse, Chorus, Bridge 등 구간을 comment로 표시해주세요
5. 주어진 키({key})에 맞는 코드를 사용해주세요

ChordPro 코드차트만 반환해주세요:"""


SECTIONS_EXTRACTION_PROMPT = """다음 ChordPro 내용에서 구간 정보를 JSON 배열로 추출해주세요.

ChordPro 내용:
{content}

각 구간에 대해 다음 정보를 추출해주세요:
- section_type: "verse", "chorus", "bridge", "pre-chorus", "intro", "outro", "instrumental" 중 하나
- section_number: 구간 번호 (Verse 1이면 1, Verse 2이면 2)
- label: 표시 레이블 (예: "Verse 1", "Chorus", "Bridge")
- lyrics: 해당 구간 가사 (코드 제외)
- chords: 해당 구간에 사용된 코드 목록

JSON 배열만 반환해주세요:
[
  {{"section_type": "verse", "section_number": 1, "label": "Verse 1", "lyrics": "...", "chords": ["G", "D", "Em", "C"]}},
  ...
]"""


class LyricsService:
    """Service for lyrics extraction and ChordPro generation."""

    async def extract_lyrics(
        self,
        title: str,
        artist: Optional[str] = None,
        key: Optional[str] = None,
        youtube_url: Optional[str] = None
    ) -> LyricsExtractionResult:
        """
        Extract lyrics and generate ChordPro content for a song.

        Uses AI to generate chord charts based on song information.
        """
        # Format the prompt
        prompt = LYRICS_EXTRACTION_PROMPT.format(
            title=title,
            artist=artist or "알 수 없음",
            key=key or "C"
        )

        # Add YouTube URL context if available
        if youtube_url:
            prompt += f"\n\nYouTube URL: {youtube_url}"
            prompt += "\n(이 URL의 영상 내용을 참고하여 정확한 코드를 생성해주세요)"

        # Call AI service
        try:
            response = await ai_service.generate(prompt, max_tokens=2000)
            chordpro_content = self._clean_chordpro_response(response)
        except Exception as e:
            # Return basic template on error
            chordpro_content = self._generate_basic_template(title, artist, key)

        # Extract sections from ChordPro content
        sections = await self._extract_sections(chordpro_content)

        return LyricsExtractionResult(
            title=title,
            artist=artist,
            key=key,
            chordpro_content=chordpro_content,
            sections=sections,
            confidence=80 if youtube_url else 60,
            source="ai"
        )

    def _clean_chordpro_response(self, response: str) -> str:
        """Clean the AI response to extract just the ChordPro content."""
        # Remove markdown code blocks if present
        response = re.sub(r'^```(?:chordpro)?\s*\n?', '', response, flags=re.MULTILINE)
        response = re.sub(r'\n?```\s*$', '', response, flags=re.MULTILINE)

        # Trim whitespace
        return response.strip()

    def _generate_basic_template(
        self,
        title: str,
        artist: Optional[str],
        key: Optional[str]
    ) -> str:
        """Generate a basic ChordPro template."""
        key = key or "C"
        lines = [
            f"{{title: {title}}}",
            f"{{artist: {artist or 'Unknown'}}}",
            f"{{key: {key}}}",
            "",
            "{comment: Verse 1}",
            f"[{key}]가사를 입력해주세요",
            "",
            "{comment: Chorus}",
            f"[{key}]후렴 가사를 입력해주세요",
        ]
        return "\n".join(lines)

    async def _extract_sections(self, chordpro_content: str) -> list[dict]:
        """Extract section information from ChordPro content."""
        sections = []
        current_section = None
        current_lyrics = []
        current_chords = set()

        for line in chordpro_content.split('\n'):
            # Check for comment directive (section marker)
            comment_match = re.match(r'\{comment:\s*(.+?)\}', line, re.IGNORECASE)
            if comment_match:
                # Save previous section if exists
                if current_section:
                    sections.append({
                        **current_section,
                        "lyrics": '\n'.join(current_lyrics),
                        "chords": list(current_chords)
                    })

                # Start new section
                label = comment_match.group(1).strip()
                section_type, section_number = self._parse_section_label(label)
                current_section = {
                    "section_type": section_type,
                    "section_number": section_number,
                    "label": label
                }
                current_lyrics = []
                current_chords = set()
                continue

            # Skip directive lines
            if line.strip().startswith('{'):
                continue

            # Extract chords from line
            chords_in_line = re.findall(r'\[([A-Ga-g][#b]?[^]]*)\]', line)
            current_chords.update(chords_in_line)

            # Extract lyrics (remove chord brackets)
            lyrics_line = re.sub(r'\[[^\]]+\]', '', line)
            if lyrics_line.strip():
                current_lyrics.append(lyrics_line.strip())

        # Save last section
        if current_section:
            sections.append({
                **current_section,
                "lyrics": '\n'.join(current_lyrics),
                "chords": list(current_chords)
            })

        return sections

    def _parse_section_label(self, label: str) -> tuple[str, int]:
        """Parse section label into type and number."""
        label_lower = label.lower()

        # Map common labels to section types
        type_map = {
            'verse': 'verse',
            '절': 'verse',
            'chorus': 'chorus',
            '후렴': 'chorus',
            'bridge': 'bridge',
            '브릿지': 'bridge',
            'pre-chorus': 'pre-chorus',
            '프리코러스': 'pre-chorus',
            'intro': 'intro',
            '인트로': 'intro',
            'outro': 'outro',
            '아웃트로': 'outro',
            'instrumental': 'instrumental',
            '간주': 'instrumental',
            'tag': 'tag',
            '태그': 'tag',
        }

        # Find section type
        section_type = 'verse'  # default
        for key, value in type_map.items():
            if key in label_lower:
                section_type = value
                break

        # Extract number
        number_match = re.search(r'(\d+)', label)
        section_number = int(number_match.group(1)) if number_match else 1

        return section_type, section_number

    def generate_chordpro_from_sections(
        self,
        title: str,
        artist: str,
        key: str,
        sections: list[dict]
    ) -> str:
        """Generate ChordPro content from structured section data."""
        lines = [
            f"{{title: {title}}}",
            f"{{artist: {artist}}}",
            f"{{key: {key}}}",
            ""
        ]

        for section in sections:
            lines.append(f"{{comment: {section['label']}}}")
            if section.get('chords') and section.get('lyrics'):
                # Combine chords with lyrics
                lines.append(section['lyrics'])
            elif section.get('lyrics'):
                lines.append(section['lyrics'])
            lines.append("")

        return '\n'.join(lines)


# Singleton instance
lyrics_service = LyricsService()
