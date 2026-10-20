from solution import group_strings


def test_group_strings_one_isolated_word():
    assert group_strings(["a", "b", "ab", "cde"]) == [2, 3]


def test_group_strings_chain_of_additions():
    assert group_strings(["a", "ab", "abc"]) == [1, 3]


def test_group_strings_single_word():
    assert group_strings(["xyz"]) == [1, 1]


def test_group_strings_same_letters_in_different_order():
    assert group_strings(["abc", "cba", "bca"]) == [1, 3]


def test_group_strings_replacement_only():
    assert group_strings(["abc", "abd", "xyz"]) == [2, 2]


def test_group_strings_all_isolated():
    assert group_strings(["ab", "cd", "ef"]) == [3, 1]
