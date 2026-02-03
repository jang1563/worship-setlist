"""
ChordPro service for parsing, transposing, and converting chord charts.

ChordPro format example:
[G]Amazing [D]grace how [Em]sweet the [C]sound

This service handles:
- Parsing ChordPro format to extract chords and lyrics
- Transposing chords to different keys
- Converting ChordPro to HTML for rendering
"""

import re
from typing import Optional
from dataclasses import dataclass


# Chromatic scale with sharp notation
CHROMATIC_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Chromatic scale with flat notation
CHROMATIC_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

# Mapping from flat to sharp notation
FLAT_TO_SHARP = {
    "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"
}

# Mapping from sharp to flat notation
SHARP_TO_FLAT = {
    "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb"
}

# Keys that typically use flats
FLAT_KEYS = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"]


@dataclass
class ChordInfo:
    """Parsed chord information."""
    root: str
    quality: str  # "", "m", "7", "maj7", "m7", "dim", "aug", "sus4", "sus2", etc.
    bass: Optional[str] = None  # For slash chords like C/E


@dataclass
class ParsedLine:
    """A parsed line with chords and lyrics."""
    segments: list[tuple[Optional[str], str]]  # List of (chord, lyric) pairs


@dataclass
class ParsedChordPro:
    """Complete parsed ChordPro document."""
    title: Optional[str]
    artist: Optional[str]
    key: Optional[str]
    tempo: Optional[int]
    lines: list[ParsedLine]
    raw_chords: list[str]


class ChordService:
    """Service for ChordPro parsing, transposition, and rendering."""

    # Regex to match chord brackets: [G], [Am7], [C/E]
    CHORD_PATTERN = re.compile(r'\[([A-Ga-g][#b]?[^]]*)\]')

    # Regex to parse individual chord parts
    CHORD_PARTS_PATTERN = re.compile(
        r'^([A-Ga-g][#b]?)'  # Root note
        r'(m|min|maj|dim|aug|sus[24]?|add[0-9]+|[0-9]+)?'  # Quality
        r'([0-9]*)'  # Extension (7, 9, 11, 13)
        r'((?:add|sus|#|b)[0-9]*)*'  # Additional modifiers
        r'(?:/([A-Ga-g][#b]?))?$'  # Bass note for slash chords
    )

    # Directive patterns for ChordPro metadata
    DIRECTIVE_PATTERN = re.compile(r'\{(\w+):\s*([^}]*)\}|\{(\w+)\}')

    def parse_chord(self, chord_str: str) -> ChordInfo:
        """Parse a chord string into its components."""
        chord_str = chord_str.strip()

        # Handle slash chords
        bass = None
        if '/' in chord_str:
            parts = chord_str.split('/')
            chord_str = parts[0]
            bass = parts[1] if len(parts) > 1 else None

        # Extract root and quality
        match = re.match(r'^([A-Ga-g][#b]?)(.*?)$', chord_str)
        if match:
            root = match.group(1).capitalize()
            if len(root) > 1:
                root = root[0].upper() + root[1].lower()
            quality = match.group(2)
            return ChordInfo(root=root, quality=quality, bass=bass)

        return ChordInfo(root=chord_str, quality="", bass=bass)

    def get_semitone_index(self, note: str) -> int:
        """Get the semitone index (0-11) of a note."""
        note = note.strip()
        if len(note) > 1:
            note = note[0].upper() + note[1].lower()
        else:
            note = note.upper()

        # Convert flat to sharp for lookup
        if note in FLAT_TO_SHARP:
            note = FLAT_TO_SHARP[note]

        try:
            return CHROMATIC_SHARP.index(note)
        except ValueError:
            return 0

    def transpose_note(self, note: str, semitones: int, use_flats: bool = False) -> str:
        """Transpose a single note by the given number of semitones."""
        if not note:
            return note

        index = self.get_semitone_index(note)
        new_index = (index + semitones) % 12

        if use_flats:
            return CHROMATIC_FLAT[new_index]
        return CHROMATIC_SHARP[new_index]

    def transpose_chord(self, chord_str: str, semitones: int, use_flats: bool = False) -> str:
        """Transpose a chord by the given number of semitones."""
        chord_info = self.parse_chord(chord_str)

        new_root = self.transpose_note(chord_info.root, semitones, use_flats)
        new_bass = self.transpose_note(chord_info.bass, semitones, use_flats) if chord_info.bass else None

        result = new_root + chord_info.quality
        if new_bass:
            result += "/" + new_bass

        return result

    def calculate_transpose_semitones(self, from_key: str, to_key: str) -> int:
        """Calculate the number of semitones to transpose from one key to another."""
        # Handle minor keys
        from_root = from_key.replace("m", "").strip()
        to_root = to_key.replace("m", "").strip()

        from_index = self.get_semitone_index(from_root)
        to_index = self.get_semitone_index(to_root)

        return (to_index - from_index) % 12

    def transpose_chordpro(self, content: str, from_key: str, to_key: str) -> str:
        """Transpose all chords in a ChordPro document."""
        semitones = self.calculate_transpose_semitones(from_key, to_key)

        if semitones == 0:
            return content

        use_flats = to_key in FLAT_KEYS

        def replace_chord(match):
            chord = match.group(1)
            transposed = self.transpose_chord(chord, semitones, use_flats)
            return f"[{transposed}]"

        return self.CHORD_PATTERN.sub(replace_chord, content)

    def parse_chordpro(self, content: str) -> ParsedChordPro:
        """Parse a ChordPro document into structured data."""
        title = None
        artist = None
        key = None
        tempo = None
        lines = []
        all_chords = []

        for line in content.split('\n'):
            line = line.rstrip()

            # Check for directives
            directive_match = self.DIRECTIVE_PATTERN.search(line)
            if directive_match:
                directive = (directive_match.group(1) or directive_match.group(3) or "").lower()
                value = directive_match.group(2) or ""

                if directive in ('title', 't'):
                    title = value
                elif directive in ('artist', 'subtitle', 'st'):
                    artist = value
                elif directive == 'key':
                    key = value
                elif directive in ('tempo', 'bpm'):
                    try:
                        tempo = int(value)
                    except ValueError:
                        pass
                continue

            # Parse chord line
            segments = []
            last_end = 0

            for match in self.CHORD_PATTERN.finditer(line):
                chord = match.group(1)
                all_chords.append(chord)

                # Get lyrics before this chord
                lyric_before = line[last_end:match.start()]
                if lyric_before or segments:  # Only add if there's content or we've started
                    if segments:
                        # Append to previous segment's lyrics
                        prev_chord, prev_lyric = segments[-1]
                        segments[-1] = (prev_chord, prev_lyric + lyric_before)
                    else:
                        segments.append((None, lyric_before))

                # Start new segment with this chord
                segments.append((chord, ""))
                last_end = match.end()

            # Add remaining lyrics after last chord
            remaining = line[last_end:]
            if segments:
                prev_chord, prev_lyric = segments[-1]
                segments[-1] = (prev_chord, prev_lyric + remaining)
            elif remaining:
                segments.append((None, remaining))

            lines.append(ParsedLine(segments=segments))

        return ParsedChordPro(
            title=title,
            artist=artist,
            key=key,
            tempo=tempo,
            lines=lines,
            raw_chords=all_chords
        )

    def extract_chords(self, content: str) -> list[str]:
        """Extract all unique chords from ChordPro content."""
        chords = self.CHORD_PATTERN.findall(content)
        # Remove duplicates while preserving order
        seen = set()
        unique_chords = []
        for chord in chords:
            if chord not in seen:
                seen.add(chord)
                unique_chords.append(chord)
        return unique_chords

    def chordpro_to_html(self, content: str, highlight_class: str = "chord") -> str:
        """Convert ChordPro format to HTML with styled chords."""
        parsed = self.parse_chordpro(content)
        html_lines = []

        for line in parsed.lines:
            if not line.segments:
                html_lines.append('<div class="chord-line empty"></div>')
                continue

            html_parts = []
            for chord, lyric in line.segments:
                if chord:
                    html_parts.append(
                        f'<span class="chord-segment">'
                        f'<span class="{highlight_class}">{self._escape_html(chord)}</span>'
                        f'<span class="lyric">{self._escape_html(lyric)}</span>'
                        f'</span>'
                    )
                else:
                    html_parts.append(f'<span class="lyric">{self._escape_html(lyric)}</span>')

            html_lines.append(f'<div class="chord-line">{"".join(html_parts)}</div>')

        return '\n'.join(html_lines)

    def chordpro_to_text(self, content: str, show_chords: bool = True) -> str:
        """Convert ChordPro to plain text with optional chord display."""
        parsed = self.parse_chordpro(content)
        text_lines = []

        for line in parsed.lines:
            if not line.segments:
                text_lines.append('')
                continue

            if show_chords:
                # Create two lines: chords above, lyrics below
                chord_line = []
                lyric_line = []
                position = 0

                for chord, lyric in line.segments:
                    if chord:
                        # Pad chord line to current position
                        while len(''.join(chord_line)) < position:
                            chord_line.append(' ')
                        chord_line.append(chord)

                    lyric_line.append(lyric)
                    position += len(lyric)

                chord_str = ''.join(chord_line)
                lyric_str = ''.join(lyric_line)

                if chord_str.strip():
                    text_lines.append(chord_str)
                if lyric_str.strip():
                    text_lines.append(lyric_str)
            else:
                # Lyrics only
                lyric_parts = [lyric for _, lyric in line.segments]
                text_lines.append(''.join(lyric_parts))

        return '\n'.join(text_lines)

    def _escape_html(self, text: str) -> str:
        """Escape HTML special characters."""
        return (text
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))

    def detect_key(self, content: str) -> Optional[str]:
        """Attempt to detect the key from chord content."""
        parsed = self.parse_chordpro(content)

        # If key is specified in metadata, use it
        if parsed.key:
            return parsed.key

        # Simple heuristic: first chord or most common chord root
        chords = parsed.raw_chords
        if not chords:
            return None

        # Count chord roots
        root_counts = {}
        for chord_str in chords:
            chord_info = self.parse_chord(chord_str)
            root = chord_info.root
            root_counts[root] = root_counts.get(root, 0) + 1

        # First chord has higher weight
        if chords:
            first_chord = self.parse_chord(chords[0])
            root_counts[first_chord.root] = root_counts.get(first_chord.root, 0) + 2

        # Return the most common root
        if root_counts:
            return max(root_counts, key=root_counts.get)

        return None

    def validate_chordpro(self, content: str) -> tuple[bool, list[str]]:
        """Validate ChordPro content and return any warnings."""
        warnings = []

        # Check for unclosed brackets
        open_count = content.count('[')
        close_count = content.count(']')
        if open_count != close_count:
            warnings.append(f"Mismatched brackets: {open_count} '[' vs {close_count} ']'")

        # Check for empty chords
        if '[]' in content:
            warnings.append("Empty chord brackets found")

        # Check for invalid chord patterns
        for match in self.CHORD_PATTERN.finditer(content):
            chord = match.group(1)
            if not re.match(r'^[A-Ga-g]', chord):
                warnings.append(f"Invalid chord: {chord}")

        is_valid = len(warnings) == 0
        return is_valid, warnings


# Singleton instance
chord_service = ChordService()
