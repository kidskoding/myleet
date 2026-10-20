from solution import find_the_difference


def test_find_the_difference_normal():
    assert find_the_difference("abcd", "abcde") == "e"


def test_find_the_difference_from_empty():
    assert find_the_difference("", "y") == "y"
