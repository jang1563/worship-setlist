"""
Unit tests for key transition service.
"""
import pytest
from app.services.key_transition import (
    normalize_key,
    get_semitone,
    get_key_distance,
    check_key_compatibility,
    get_pivot_chords,
    suggest_bridge_progression,
    analyze_setlist_key_flow,
)


class TestNormalizeKey:
    """Tests for normalize_key function."""

    def test_major_key(self):
        """Major keys should return base key and is_minor=False."""
        assert normalize_key("G") == ("G", False)
        assert normalize_key("C") == ("C", False)
        assert normalize_key("F#") == ("F#", False)
        assert normalize_key("Bb") == ("Bb", False)

    def test_minor_key(self):
        """Minor keys should return base key and is_minor=True."""
        assert normalize_key("Am") == ("A", True)
        assert normalize_key("Em") == ("E", True)
        assert normalize_key("F#m") == ("F#", True)


class TestGetSemitone:
    """Tests for get_semitone function."""

    def test_natural_keys(self):
        """Test natural key semitones."""
        assert get_semitone("C") == 0
        assert get_semitone("D") == 2
        assert get_semitone("E") == 4
        assert get_semitone("F") == 5
        assert get_semitone("G") == 7
        assert get_semitone("A") == 9
        assert get_semitone("B") == 11

    def test_sharp_flat_equivalents(self):
        """Test enharmonic equivalents."""
        assert get_semitone("C#") == get_semitone("Db")
        assert get_semitone("D#") == get_semitone("Eb")
        assert get_semitone("F#") == get_semitone("Gb")
        assert get_semitone("G#") == get_semitone("Ab")
        assert get_semitone("A#") == get_semitone("Bb")

    def test_minor_keys(self):
        """Minor keys should return same semitone as their base."""
        assert get_semitone("Am") == 9
        assert get_semitone("Em") == 4


class TestGetKeyDistance:
    """Tests for get_key_distance function."""

    def test_same_key(self):
        """Same key should have distance 0."""
        assert get_key_distance("G", "G") == 0
        assert get_key_distance("C", "C") == 0

    def test_half_step(self):
        """Half step distance should be 1."""
        assert get_key_distance("C", "C#") == 1
        assert get_key_distance("E", "F") == 1

    def test_whole_step(self):
        """Whole step distance should be 2."""
        assert get_key_distance("C", "D") == 2
        assert get_key_distance("G", "A") == 2

    def test_tritone(self):
        """Tritone should be max distance of 6."""
        assert get_key_distance("C", "F#") == 6
        assert get_key_distance("G", "Db") == 6

    def test_symmetry(self):
        """Distance should be same regardless of direction."""
        assert get_key_distance("C", "G") == get_key_distance("G", "C")
        assert get_key_distance("A", "E") == get_key_distance("E", "A")


class TestCheckKeyCompatibility:
    """Tests for check_key_compatibility function."""

    def test_same_key_natural(self):
        """Same key should be '자연스러움'."""
        assert check_key_compatibility("G", "G") == "자연스러움"
        assert check_key_compatibility("C", "C") == "자연스러움"

    def test_half_step_natural(self):
        """Half step up/down should be '자연스러움'."""
        assert check_key_compatibility("G", "G#") == "자연스러움"
        assert check_key_compatibility("C", "Db") == "자연스러움"

    def test_whole_step_natural(self):
        """Whole step should be '자연스러움'."""
        assert check_key_compatibility("G", "A") == "자연스러움"
        assert check_key_compatibility("C", "D") == "자연스러움"

    def test_fourth_natural(self):
        """Perfect 4th should be '자연스러움'."""
        assert check_key_compatibility("G", "C") == "자연스러움"
        assert check_key_compatibility("C", "F") == "자연스러움"

    def test_fifth_natural(self):
        """Perfect 5th should be '자연스러움'."""
        assert check_key_compatibility("G", "D") == "자연스러움"
        assert check_key_compatibility("C", "G") == "자연스러움"

    def test_relative_minor_ok(self):
        """Relative minor should be '괜찮음'."""
        assert check_key_compatibility("G", "Em") == "괜찮음"
        assert check_key_compatibility("C", "Am") == "괜찮음"

    def test_relative_major_ok(self):
        """Relative major should be '괜찮음'."""
        assert check_key_compatibility("Am", "C") == "괜찮음"
        assert check_key_compatibility("Em", "G") == "괜찮음"

    def test_minor_third_ok(self):
        """Minor 3rd distance should be '괜찮음'."""
        assert check_key_compatibility("C", "Eb") == "괜찮음"
        assert check_key_compatibility("G", "Bb") == "괜찮음"

    def test_tritone_awkward(self):
        """Tritone should be '어색함'."""
        assert check_key_compatibility("C", "F#") == "어색함"
        assert check_key_compatibility("G", "C#") == "어색함"

    def test_major_third_awkward(self):
        """Major 3rd distance should be '어색함'."""
        assert check_key_compatibility("C", "E") == "어색함"
        assert check_key_compatibility("G", "B") == "어색함"


class TestGetPivotChords:
    """Tests for get_pivot_chords function."""

    def test_returns_list(self):
        """Should always return a list."""
        result = get_pivot_chords("G", "A")
        assert isinstance(result, list)
        assert len(result) > 0

    def test_whole_step_has_sus4(self):
        """Whole step transition should suggest sus4."""
        result = get_pivot_chords("G", "A")
        assert any("sus4" in chord for chord in result)

    def test_fourth_interval(self):
        """4th interval should suggest dominant chord."""
        result = get_pivot_chords("G", "C")
        assert len(result) > 0

    def test_fifth_interval(self):
        """5th interval should have suggestion."""
        result = get_pivot_chords("C", "G")
        assert len(result) > 0


class TestSuggestBridgeProgression:
    """Tests for suggest_bridge_progression function."""

    def test_returns_dict(self):
        """Should return properly structured dict."""
        result = suggest_bridge_progression("G", "A")
        assert "compatibility" in result
        assert "distance" in result
        assert "progressions" in result

    def test_same_key_direct(self):
        """Same key should suggest direct connection."""
        result = suggest_bridge_progression("G", "G")
        assert result["compatibility"] == "자연스러움"
        assert result["distance"] == 0
        assert any(p["type"] == "direct" for p in result["progressions"])

    def test_natural_transition_has_options(self):
        """Natural transitions should have multiple options."""
        result = suggest_bridge_progression("G", "A")
        assert result["compatibility"] == "자연스러움"
        assert len(result["progressions"]) >= 1

    def test_awkward_transition_needs_bridge(self):
        """Awkward transitions should suggest bridge."""
        result = suggest_bridge_progression("C", "F#")
        assert result["compatibility"] == "어색함"
        assert any("bridge" in p["type"] for p in result["progressions"])


class TestAnalyzeSetlistKeyFlow:
    """Tests for analyze_setlist_key_flow function."""

    def test_single_song(self):
        """Single song should be '자연스러움' with no transitions."""
        result = analyze_setlist_key_flow(["G"])
        assert result["overall"] == "자연스러움"
        assert len(result["transitions"]) == 0
        assert len(result["warnings"]) == 0

    def test_empty_list(self):
        """Empty list should be '자연스러움'."""
        result = analyze_setlist_key_flow([])
        assert result["overall"] == "자연스러움"

    def test_all_same_key(self):
        """All same keys should be '자연스러움'."""
        result = analyze_setlist_key_flow(["G", "G", "G"])
        assert result["overall"] == "자연스러움"
        assert all(t["compatibility"] == "자연스러움" for t in result["transitions"])

    def test_natural_flow(self):
        """Natural key flow should have good rating."""
        result = analyze_setlist_key_flow(["G", "D", "A"])
        assert result["overall"] in ["자연스러움", "괜찮음"]

    def test_awkward_transition_warning(self):
        """Awkward transitions should generate warnings."""
        result = analyze_setlist_key_flow(["C", "F#", "G"])
        assert len(result["warnings"]) > 0
        assert result["overall"] == "어색함"

    def test_worst_compatibility_wins(self):
        """Overall should be worst transition."""
        # G->A is natural, A->Eb is awkward
        result = analyze_setlist_key_flow(["G", "A", "Eb"])
        assert result["overall"] == "어색함"

    def test_transition_count(self):
        """Should have n-1 transitions for n songs."""
        keys = ["G", "A", "D", "E", "B"]
        result = analyze_setlist_key_flow(keys)
        assert len(result["transitions"]) == 4
