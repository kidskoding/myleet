from solution import expressive_words


def test_expressive_words_one_stretchy():
    assert expressive_words("heeellooo", ["hello", "hi", "helo"]) == 1


def test_expressive_words_all_stretchy():
    assert expressive_words("zzzzzyyyyy", ["zzyy", "zy", "zyy"]) == 3


def test_expressive_words_identical_word():
    assert expressive_words("abc", ["abc"]) == 1


def test_expressive_words_group_of_two_cannot_stretch():
    assert expressive_words("aa", ["a"]) == 0


def test_expressive_words_word_group_longer_than_s():
    assert expressive_words("aaa", ["a", "aa", "aaaa"]) == 2


def test_expressive_words_different_letters():
    assert expressive_words("abcd", ["abc", "abce"]) == 0
