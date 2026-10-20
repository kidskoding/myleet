from solution import delete_string


def test_delete_string_example_one():
    assert delete_string("abcabcdabc") == 2


def test_delete_string_example_two():
    assert delete_string("aaabaab") == 4


def test_delete_string_all_same():
    assert delete_string("aaaaa") == 5


def test_delete_string_single_letter():
    assert delete_string("z") == 1


def test_delete_string_no_repeat():
    assert delete_string("abcd") == 1


def test_delete_string_repeated_pair():
    assert delete_string("abab") == 2
