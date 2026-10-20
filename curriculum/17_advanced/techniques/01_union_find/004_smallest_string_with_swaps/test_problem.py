from solution import smallest_string_with_swaps


def test_smallest_string_with_swaps_normal():
    assert smallest_string_with_swaps("dcab", [[0, 3], [1, 2]]) == "bacd"


def test_smallest_string_with_swaps_no_pairs():
    assert smallest_string_with_swaps("zyx", []) == "zyx"


def test_smallest_string_with_swaps_full_chain():
    assert smallest_string_with_swaps("dcab", [[0, 3], [1, 2], [0, 2]]) == "abcd"
