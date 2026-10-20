from solution import get_hint


def test_get_hint_mixed():
    assert get_hint("1807", "7810") == "1A3B"


def test_get_hint_duplicate_digits():
    assert get_hint("1123", "0111") == "1A1B"


def test_get_hint_all_bulls():
    assert get_hint("1234", "1234") == "4A0B"


def test_get_hint_all_cows():
    assert get_hint("1122", "2211") == "0A4B"


def test_get_hint_nothing_matches():
    assert get_hint("1", "0") == "0A0B"
