from solution import max_length


def test_max_length_example_one():
    assert max_length(["un", "iq", "ue"]) == 4


def test_max_length_example_two():
    assert max_length(["cha", "r", "act", "ers"]) == 6


def test_max_length_whole_alphabet():
    assert max_length(["abcdefghijklmnopqrstuvwxyz"]) == 26


def test_max_length_words_with_repeats_are_unusable():
    assert max_length(["aa", "bb"]) == 0


def test_max_length_skip_overlapping_word():
    assert max_length(["abc", "def", "bcd"]) == 6


def test_max_length_single_letters():
    assert max_length(["a", "b", "a", "c"]) == 3
