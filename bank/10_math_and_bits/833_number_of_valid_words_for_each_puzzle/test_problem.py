from solution import find_num_of_valid_words


def test_find_num_of_valid_words_example_one():
    words = ["aaaa", "asas", "able", "ability", "actt", "actor", "access"]
    puzzles = ["aboveyz", "abrodyz", "abslute", "absoryz", "actresz", "gaswxyz"]
    assert find_num_of_valid_words(words, puzzles) == [1, 1, 3, 2, 4, 0]


def test_find_num_of_valid_words_example_two():
    words = ["apple", "pleas", "please"]
    puzzles = ["aelwxyz", "aelpxyz", "aelpsxy", "saelpxy", "xaelpsy"]
    assert find_num_of_valid_words(words, puzzles) == [0, 1, 3, 2, 0]


def test_find_num_of_valid_words_first_letter_required():
    assert find_num_of_valid_words(["bbbb"], ["abcdefg"]) == [0]


def test_find_num_of_valid_words_duplicate_words():
    assert find_num_of_valid_words(["abab", "baba", "abba"], ["bacdefg"]) == [3]


def test_find_num_of_valid_words_extra_letter_rejected():
    assert find_num_of_valid_words(["abcz", "abcd"], ["abcdefg"]) == [1]
