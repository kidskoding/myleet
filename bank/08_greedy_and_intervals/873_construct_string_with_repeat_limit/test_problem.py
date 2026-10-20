from solution import repeat_limited_string


def test_repeat_limited_string_uses_all():
    assert repeat_limited_string("cczazcc", 3) == "zzcccac"


def test_repeat_limited_string_drops_leftovers():
    assert repeat_limited_string("aababab", 2) == "bbabaa"


def test_repeat_limited_string_single_letter_capped():
    assert repeat_limited_string("aaaa", 2) == "aa"


def test_repeat_limited_string_limit_one():
    assert repeat_limited_string("zzzab", 1) == "zbzaz"


def test_repeat_limited_string_sorted_descending_when_unconstrained():
    assert repeat_limited_string("abcabc", 6) == "ccbbaa"
