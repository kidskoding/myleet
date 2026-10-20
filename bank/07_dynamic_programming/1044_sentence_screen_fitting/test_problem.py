from solution import words_typing


def test_words_typing_hello_world():
    assert words_typing(["hello", "world"], 2, 8) == 1


def test_words_typing_wraps_across_rows():
    assert words_typing(["a", "bcd", "e"], 3, 6) == 2


def test_words_typing_four_words():
    assert words_typing(["i", "had", "apple", "pie"], 4, 5) == 1


def test_words_typing_word_wider_than_screen():
    assert words_typing(["abcdef"], 3, 3) == 0


def test_words_typing_one_char_screen():
    assert words_typing(["a"], 1, 1) == 1


def test_words_typing_full_sentence_per_row():
    assert words_typing(["a", "b"], 3, 3) == 3
