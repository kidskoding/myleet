from solution import is_prefix_of_word


def test_is_prefix_of_word_found():
    assert is_prefix_of_word("i love eating burger", "burg") == 4


def test_is_prefix_of_word_first_match_wins():
    assert is_prefix_of_word("this problem is an easy problem", "pro") == 2


def test_is_prefix_of_word_missing():
    assert is_prefix_of_word("i am tired", "you") == -1


def test_is_prefix_of_word_whole_word():
    assert is_prefix_of_word("hello", "hello") == 1


def test_is_prefix_of_word_inside_word_does_not_count():
    assert is_prefix_of_word("hellohello hellohellohello", "ell") == -1


def test_is_prefix_of_word_search_longer_than_word():
    assert is_prefix_of_word("ab abc", "abc") == 2
