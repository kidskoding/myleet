from solution import find_replace_string


def test_find_replace_string_both_match():
    assert find_replace_string("abcd", [0, 2], ["a", "cd"], ["eee", "ffff"]) == "eeebffff"


def test_find_replace_string_one_mismatch():
    assert find_replace_string("abcd", [0, 2], ["ab", "ec"], ["eee", "ffff"]) == "eeecd"


def test_find_replace_string_unsorted_indices():
    result = find_replace_string("vmokgggqzp", [3, 5, 1], ["kg", "ggq", "mo"], ["s", "so", "bfr"])
    assert result == "vbfrssozp"


def test_find_replace_string_no_match():
    assert find_replace_string("abc", [1], ["c"], ["x"]) == "abc"


def test_find_replace_string_replacement_at_end():
    assert find_replace_string("abc", [2], ["c"], ["xyz"]) == "abxyz"
