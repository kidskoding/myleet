from solution import longest_word_in_dictionary


def test_longest_word_in_dictionary_normal():
    words = ["w", "wo", "wor", "worl", "world"]
    assert longest_word_in_dictionary(words) == "world"


def test_longest_word_in_dictionary_no_valid_chain():
    words = ["a", "banana", "app", "appl", "ap", "apply", "apple"]
    assert longest_word_in_dictionary(words) == "apple"


def test_longest_word_in_dictionary_empty():
    assert longest_word_in_dictionary([]) == ""
