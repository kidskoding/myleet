from solution import longest_path


def test_longest_path_example_one():
    assert longest_path([-1, 0, 0, 1, 1, 2], "abacbe") == 3


def test_longest_path_example_two():
    assert longest_path([-1, 0, 0, 0], "aabc") == 3


def test_longest_path_single_node():
    assert longest_path([-1], "z") == 1


def test_longest_path_all_same_character():
    assert longest_path([-1, 0, 1], "aaa") == 1


def test_longest_path_alternating_chain():
    assert longest_path([-1, 0, 1, 2], "abab") == 4


def test_longest_path_bends_through_root():
    assert longest_path([-1, 0, 0, 1, 2], "abcde") == 5
