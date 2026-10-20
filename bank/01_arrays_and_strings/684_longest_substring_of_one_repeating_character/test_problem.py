from solution import longest_repeating


def test_longest_repeating_example_one():
    assert longest_repeating("babacc", "bcb", [1, 3, 3]) == [3, 3, 4]


def test_longest_repeating_example_two():
    assert longest_repeating("abyzz", "aa", [2, 1]) == [2, 3]


def test_longest_repeating_single_character():
    assert longest_repeating("a", "bc", [0, 0]) == [1, 1]


def test_longest_repeating_merge_whole_string():
    assert longest_repeating("aabaa", "a", [2]) == [5]


def test_longest_repeating_split_run():
    assert longest_repeating("aaaaa", "bb", [2, 0]) == [2, 2]


def test_longest_repeating_same_character_update():
    assert longest_repeating("abc", "b", [1]) == [1]
