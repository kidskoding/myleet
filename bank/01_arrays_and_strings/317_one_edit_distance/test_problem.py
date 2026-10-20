from solution import is_one_edit_distance


def test_is_one_edit_distance_insert():
    assert is_one_edit_distance("ab", "acb") is True


def test_is_one_edit_distance_both_empty():
    assert is_one_edit_distance("", "") is False


def test_is_one_edit_distance_delete_to_empty():
    assert is_one_edit_distance("a", "") is True


def test_is_one_edit_distance_identical():
    assert is_one_edit_distance("abc", "abc") is False


def test_is_one_edit_distance_replace():
    assert is_one_edit_distance("abcd", "abed") is True


def test_is_one_edit_distance_swap_is_two_edits():
    assert is_one_edit_distance("ab", "ba") is False


def test_is_one_edit_distance_length_gap_too_big():
    assert is_one_edit_distance("cab", "a") is False
