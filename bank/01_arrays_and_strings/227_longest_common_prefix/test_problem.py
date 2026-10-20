from solution import longest_common_prefix


def test_longest_common_prefix_shared():
    assert longest_common_prefix(["flower", "flow", "flight"]) == "fl"


def test_longest_common_prefix_none():
    assert longest_common_prefix(["dog", "racecar", "car"]) == ""


def test_longest_common_prefix_single_string():
    assert longest_common_prefix(["alone"]) == "alone"


def test_longest_common_prefix_empty_string_member():
    assert longest_common_prefix(["", "b"]) == ""


def test_longest_common_prefix_one_is_prefix_of_other():
    assert longest_common_prefix(["ab", "a"]) == "a"


def test_longest_common_prefix_identical():
    assert longest_common_prefix(["same", "same"]) == "same"
