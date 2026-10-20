from solution import reverse_words


def test_reverse_words_normal():
    assert reverse_words("the sky is blue") == "blue is sky the"


def test_reverse_words_strips_extra_spaces():
    assert reverse_words("  hello world  ") == "world hello"
