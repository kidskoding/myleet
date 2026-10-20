from solution import length_of_last_word


def test_length_of_last_word_two_words():
    assert length_of_last_word("Hello World") == 5


def test_length_of_last_word_extra_spaces():
    assert length_of_last_word("   fly me   to   the moon  ") == 4


def test_length_of_last_word_example_three():
    assert length_of_last_word("luffy is still joyboy") == 6


def test_length_of_last_word_single_letter():
    assert length_of_last_word("a") == 1


def test_length_of_last_word_trailing_space_only_word():
    assert length_of_last_word("abc ") == 3
