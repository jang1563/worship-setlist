"""Key transition compatibility checker and bridge chord suggestions."""

from typing import Literal

KeyCompatibility = Literal["자연스러움", "괜찮음", "어색함"]


# Key to semitone mapping
KEY_SEMITONES = {
    "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
    "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
    "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
}

# Relative minor/major mappings
RELATIVE_KEYS = {
    "C": "Am", "G": "Em", "D": "Bm", "A": "F#m", "E": "C#m",
    "B": "G#m", "F#": "D#m", "Gb": "Ebm", "Db": "Bbm", "Ab": "Fm",
    "Eb": "Cm", "Bb": "Gm", "F": "Dm",
    "Am": "C", "Em": "G", "Bm": "D", "F#m": "A", "C#m": "E",
    "G#m": "B", "D#m": "F#", "Ebm": "Gb", "Bbm": "Db", "Fm": "Ab",
    "Cm": "Eb", "Gm": "Bb", "Dm": "F"
}


def normalize_key(key: str) -> tuple[str, bool]:
    """Normalize key and return (base_key, is_minor)."""
    is_minor = key.endswith("m")
    base = key[:-1] if is_minor else key
    return base, is_minor


def get_semitone(key: str) -> int:
    """Get semitone value for a key."""
    base, _ = normalize_key(key)
    return KEY_SEMITONES.get(base, 0)


def get_key_distance(from_key: str, to_key: str) -> int:
    """Calculate semitone distance between two keys (0-6)."""
    from_semi = get_semitone(from_key)
    to_semi = get_semitone(to_key)
    distance = abs(to_semi - from_semi)
    return min(distance, 12 - distance)


def check_key_compatibility(from_key: str, to_key: str) -> KeyCompatibility:
    """
    Check the compatibility of transitioning between two keys.

    Returns:
        "자연스러움": Same key, ±2 semitones, or 4th/5th relationship
        "괜찮음": ±3 semitones, relative major/minor
        "어색함": ±4 semitones or more
    """
    # Same key
    if from_key == to_key:
        return "자연스러움"

    distance = get_key_distance(from_key, to_key)

    # Check relative major/minor
    if RELATIVE_KEYS.get(from_key) == to_key or RELATIVE_KEYS.get(to_key) == from_key:
        return "괜찮음"

    # Check 4th/5th relationship (5 or 7 semitones)
    from_semi = get_semitone(from_key)
    to_semi = get_semitone(to_key)
    interval = (to_semi - from_semi) % 12

    if interval in [5, 7]:  # Perfect 4th or 5th
        return "자연스러움"

    # Based on semitone distance
    if distance <= 2:
        return "자연스러움"
    elif distance == 3:
        return "괜찮음"
    else:
        return "어색함"


def get_pivot_chords(from_key: str, to_key: str) -> list[str]:
    """Get common pivot chords between two keys."""
    # Common chord progressions for transitions
    from_base, from_minor = normalize_key(from_key)
    to_base, to_minor = normalize_key(to_key)

    pivot_options = []

    # Same key family transitions
    if get_key_distance(from_key, to_key) == 2:  # Whole step up
        pivot_options.append(f"{from_base}sus4 → {to_base}")

    # 4th/5th transitions
    from_semi = get_semitone(from_key)
    to_semi = get_semitone(to_key)
    interval = (to_semi - from_semi) % 12

    if interval == 5:  # Going up a 4th (or down a 5th)
        pivot_options.append(f"{from_base} → {from_base}7 → {to_base}")
    elif interval == 7:  # Going up a 5th (or down a 4th)
        pivot_options.append(f"{from_base} → {to_base}/F# → {to_base}")

    # Chromatic approach
    if get_key_distance(from_key, to_key) in [1, 2]:
        pivot_options.append(f"{from_base} → {from_base}sus4 → {to_base}")

    return pivot_options if pivot_options else [f"{from_base} → {to_base}"]


def suggest_bridge_progression(from_key: str, to_key: str) -> dict:
    """
    Suggest a bridge chord progression between two keys.

    Returns:
        {
            "compatibility": "자연스러움|괜찮음|어색함",
            "distance": int (semitones),
            "progressions": [
                {
                    "type": str,
                    "chords": str,
                    "description": str
                }
            ]
        }
    """
    compatibility = check_key_compatibility(from_key, to_key)
    distance = get_key_distance(from_key, to_key)

    progressions = []

    if compatibility == "자연스러움":
        if from_key == to_key:
            progressions.append({
                "type": "direct",
                "chords": f"{from_key} → {to_key}",
                "description": "같은 키로 직접 연결"
            })
        else:
            progressions.append({
                "type": "direct",
                "chords": f"{from_key} → {to_key}",
                "description": "직접 전환 가능"
            })
            progressions.append({
                "type": "pivot",
                "chords": get_pivot_chords(from_key, to_key)[0],
                "description": "피벗 코드를 통한 부드러운 전환"
            })

    elif compatibility == "괜찮음":
        progressions.append({
            "type": "pivot",
            "chords": get_pivot_chords(from_key, to_key)[0],
            "description": "피벗 코드 사용 권장"
        })
        progressions.append({
            "type": "bridge",
            "chords": f"{from_key} → (2마디 브릿지) → {to_key}",
            "description": "악기 브릿지로 자연스럽게 연결"
        })

    else:  # 어색함
        progressions.append({
            "type": "bridge",
            "chords": f"{from_key} → (4마디 브릿지) → {to_key}",
            "description": "충분한 악기 브릿지 필요"
        })
        progressions.append({
            "type": "modulation",
            "chords": f"{from_key} → 중간 키 → {to_key}",
            "description": "중간 키를 거쳐 점진적 전조 권장"
        })

    return {
        "compatibility": compatibility,
        "distance": distance,
        "progressions": progressions
    }


def analyze_setlist_key_flow(keys: list[str]) -> dict:
    """
    Analyze the key flow of an entire setlist.

    Returns:
        {
            "overall": "자연스러움|괜찮음|어색함",
            "transitions": [
                {
                    "from": str,
                    "to": str,
                    "compatibility": str
                }
            ],
            "warnings": [str]
        }
    """
    if len(keys) < 2:
        return {
            "overall": "자연스러움",
            "transitions": [],
            "warnings": []
        }

    transitions = []
    warnings = []
    worst_compatibility = "자연스러움"

    compatibility_order = {"자연스러움": 0, "괜찮음": 1, "어색함": 2}

    for i in range(len(keys) - 1):
        from_key = keys[i]
        to_key = keys[i + 1]
        compatibility = check_key_compatibility(from_key, to_key)

        transitions.append({
            "from": from_key,
            "to": to_key,
            "compatibility": compatibility
        })

        if compatibility_order[compatibility] > compatibility_order[worst_compatibility]:
            worst_compatibility = compatibility

        if compatibility == "어색함":
            warnings.append(f"{i+1}번째 → {i+2}번째 곡: {from_key} → {to_key} 전환이 어색할 수 있습니다")

    return {
        "overall": worst_compatibility,
        "transitions": transitions,
        "warnings": warnings
    }
