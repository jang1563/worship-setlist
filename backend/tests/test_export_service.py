"""
Unit tests for export service.
"""
import json
import pytest
from app.services.export_service import ExportService, ExportedSong


@pytest.fixture
def export_service():
    """Create export service instance."""
    return ExportService()


@pytest.fixture
def sample_song():
    """Create sample song for testing."""
    return ExportedSong(
        title="테스트 찬양",
        artist="테스트 아티스트",
        key="G",
        lyrics=[
            {"section": "Verse 1", "content": "[G]주를 찬양합니다 [D]할렐루야\n[Em]영원하신 주의 [C]사랑"},
            {"section": "Chorus", "content": "[G]높이 높이 [D]찬양해\n[Em]예수 그리스도 [C]나의 [G]왕"}
        ],
        chords="G D Em C"
    )


@pytest.fixture
def sample_songs(sample_song):
    """Create list of sample songs."""
    song2 = ExportedSong(
        title="두번째 찬양",
        artist="다른 아티스트",
        key="D",
        lyrics=[
            {"section": "Verse 1", "content": "[D]영광의 주님께 [A]찬양드리네"},
        ]
    )
    return [sample_song, song2]


class TestExportToProPresenter:
    """Tests for ProPresenter export."""

    def test_returns_valid_json(self, export_service, sample_songs):
        """Should return valid JSON string."""
        result = export_service.export_to_propresenter(sample_songs)
        data = json.loads(result)
        assert "name" in data
        assert "songs" in data

    def test_contains_all_songs(self, export_service, sample_songs):
        """Should include all songs."""
        result = export_service.export_to_propresenter(sample_songs)
        data = json.loads(result)
        assert len(data["songs"]) == 2

    def test_song_metadata(self, export_service, sample_song):
        """Should include song metadata."""
        result = export_service.export_to_propresenter([sample_song])
        data = json.loads(result)
        song = data["songs"][0]
        assert song["title"] == "테스트 찬양"
        assert song["artist"] == "테스트 아티스트"
        assert song["key"] == "G"

    def test_slide_structure(self, export_service, sample_song):
        """Should create slides from sections."""
        result = export_service.export_to_propresenter([sample_song])
        data = json.loads(result)
        slides = data["songs"][0]["slides"]
        assert len(slides) == 2
        assert slides[0]["label"] == "Verse 1"
        assert slides[1]["label"] == "Chorus"

    def test_custom_setlist_name(self, export_service, sample_songs):
        """Should use custom setlist name."""
        result = export_service.export_to_propresenter(sample_songs, "주일 예배 찬양")
        data = json.loads(result)
        assert data["name"] == "주일 예배 찬양"

    def test_includes_version(self, export_service, sample_songs):
        """Should include ProPresenter version."""
        result = export_service.export_to_propresenter(sample_songs)
        data = json.loads(result)
        assert data["version"] == "700"


class TestExportToOpenLyrics:
    """Tests for OpenLyrics XML export."""

    def test_returns_xml_string(self, export_service, sample_song):
        """Should return XML string."""
        result = export_service.export_to_openlyrics(sample_song)
        assert result.startswith("<?xml")
        assert "<song" in result

    def test_contains_title(self, export_service, sample_song):
        """Should include song title."""
        result = export_service.export_to_openlyrics(sample_song)
        assert "<title>테스트 찬양</title>" in result

    def test_contains_author(self, export_service, sample_song):
        """Should include author."""
        result = export_service.export_to_openlyrics(sample_song)
        assert "<author>테스트 아티스트</author>" in result

    def test_contains_key(self, export_service, sample_song):
        """Should include key."""
        result = export_service.export_to_openlyrics(sample_song)
        assert "<key>G</key>" in result

    def test_contains_verses(self, export_service, sample_song):
        """Should include verse elements."""
        result = export_service.export_to_openlyrics(sample_song)
        assert "<verse" in result
        assert "<lyrics>" in result

    def test_namespace(self, export_service, sample_song):
        """Should include OpenLyrics namespace."""
        result = export_service.export_to_openlyrics(sample_song)
        assert 'xmlns="http://openlyrics.info/namespace/2009/song"' in result

    def test_created_in_attribute(self, export_service, sample_song):
        """Should include createdIn attribute."""
        result = export_service.export_to_openlyrics(sample_song)
        assert 'createdIn="송플래너"' in result


class TestExportToPlainText:
    """Tests for plain text export."""

    def test_returns_string(self, export_service, sample_songs):
        """Should return string."""
        result = export_service.export_to_plain_text(sample_songs)
        assert isinstance(result, str)

    def test_includes_headers(self, export_service, sample_song):
        """Should include song headers by default."""
        result = export_service.export_to_plain_text([sample_song])
        assert "제목: 테스트 찬양" in result
        assert "아티스트: 테스트 아티스트" in result
        assert "키: G" in result

    def test_no_headers_option(self, export_service, sample_song):
        """Should exclude headers when disabled."""
        result = export_service.export_to_plain_text([sample_song], include_headers=False)
        assert "제목:" not in result
        assert "아티스트:" not in result

    def test_includes_chords_by_default(self, export_service, sample_song):
        """Should include chords when enabled."""
        result = export_service.export_to_plain_text([sample_song], include_chords=True)
        assert "[G]" in result

    def test_removes_chords_when_disabled(self, export_service, sample_song):
        """Should remove chords when disabled."""
        result = export_service.export_to_plain_text([sample_song], include_chords=False)
        assert "[G]" not in result
        assert "주를 찬양합니다" in result

    def test_includes_section_labels(self, export_service, sample_song):
        """Should include section labels."""
        result = export_service.export_to_plain_text([sample_song])
        assert "[Verse 1]" in result
        assert "[Chorus]" in result


class TestExportSetlistToHtml:
    """Tests for HTML export."""

    def test_returns_html(self, export_service, sample_songs):
        """Should return valid HTML structure."""
        result = export_service.export_setlist_to_html(sample_songs, "테스트 셋리스트")
        assert "<!DOCTYPE html>" in result
        assert "<html" in result
        assert "</html>" in result

    def test_includes_setlist_name(self, export_service, sample_songs):
        """Should include setlist name."""
        result = export_service.export_setlist_to_html(sample_songs, "주일 예배")
        assert "<h1>주일 예배</h1>" in result
        assert "<title>주일 예배</title>" in result

    def test_includes_date(self, export_service, sample_songs):
        """Should include date when provided."""
        result = export_service.export_setlist_to_html(sample_songs, "예배", date="2025-01-05")
        assert "2025-01-05" in result

    def test_includes_service_type(self, export_service, sample_songs):
        """Should include service type."""
        result = export_service.export_setlist_to_html(sample_songs, "예배", service_type="주일 오전 예배")
        assert "주일 오전 예배" in result

    def test_includes_all_songs(self, export_service, sample_songs):
        """Should include all songs."""
        result = export_service.export_setlist_to_html(sample_songs, "테스트")
        assert "테스트 찬양" in result
        assert "두번째 찬양" in result

    def test_numbered_songs(self, export_service, sample_songs):
        """Should number songs."""
        result = export_service.export_setlist_to_html(sample_songs, "테스트")
        assert "1. 테스트 찬양" in result
        assert "2. 두번째 찬양" in result

    def test_includes_song_keys(self, export_service, sample_songs):
        """Should display song keys."""
        result = export_service.export_setlist_to_html(sample_songs, "테스트")
        assert ">G<" in result
        assert ">D<" in result

    def test_includes_styles(self, export_service, sample_songs):
        """Should include CSS styles."""
        result = export_service.export_setlist_to_html(sample_songs, "테스트")
        assert "<style>" in result
        assert "</style>" in result

    def test_chord_formatting(self, export_service, sample_song):
        """Chords should be wrapped in spans."""
        result = export_service.export_setlist_to_html([sample_song], "테스트")
        assert 'class="chord"' in result

    def test_print_styles(self, export_service, sample_songs):
        """Should include print media query."""
        result = export_service.export_setlist_to_html(sample_songs, "테스트")
        assert "@media print" in result

    def test_footer(self, export_service, sample_songs):
        """Should include footer."""
        result = export_service.export_setlist_to_html(sample_songs, "테스트")
        assert "송플래너" in result


class TestChordproToSections:
    """Tests for ChordPro to sections conversion."""

    def test_basic_conversion(self, export_service):
        """Should convert ChordPro to sections."""
        chordpro = """{title: Test}
{comment: Verse 1}
[G]Hello [D]World

{comment: Chorus}
[Em]This is [C]chorus"""
        result = export_service.chordpro_to_sections(chordpro)
        assert len(result) == 2
        assert result[0]["section"] == "Verse 1"
        assert result[1]["section"] == "Chorus"

    def test_preserves_chords(self, export_service):
        """Should preserve chord brackets."""
        chordpro = """{comment: Verse}
[G]Hello [D]World"""
        result = export_service.chordpro_to_sections(chordpro)
        assert "[G]" in result[0]["content"]
        assert "[D]" in result[0]["content"]

    def test_skips_directives(self, export_service):
        """Should skip ChordPro directives."""
        chordpro = """{title: Test}
{artist: Artist}
{key: G}
{comment: Verse}
Lyrics here"""
        result = export_service.chordpro_to_sections(chordpro)
        assert "{title:" not in result[0]["content"]
        assert "Lyrics here" in result[0]["content"]

    def test_default_section_name(self, export_service):
        """Content before first comment should be 'Verse'."""
        chordpro = """[G]Initial lyrics

{comment: Chorus}
[C]Chorus lyrics"""
        result = export_service.chordpro_to_sections(chordpro)
        assert result[0]["section"] == "Verse"

    def test_empty_input(self, export_service):
        """Empty input should return empty list."""
        result = export_service.chordpro_to_sections("")
        assert len(result) == 0

    def test_multiline_section(self, export_service):
        """Should handle multiline sections."""
        chordpro = """{comment: Verse 1}
Line one
Line two
Line three"""
        result = export_service.chordpro_to_sections(chordpro)
        assert "Line one" in result[0]["content"]
        assert "Line two" in result[0]["content"]
        assert "Line three" in result[0]["content"]
