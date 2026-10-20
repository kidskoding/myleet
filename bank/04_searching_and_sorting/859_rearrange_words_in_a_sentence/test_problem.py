from solution import arrange_words


def test_arrange_words_example_three_words():
    assert arrange_words("Leetcode is cool") == "Is cool leetcode"


def test_arrange_words_example_ties_keep_order():
    assert arrange_words("Keep calm and code on") == "On and keep calm code"


def test_arrange_words_example_already_short_first():
    assert arrange_words("To be or not to be") == "To be or to be not"


def test_arrange_words_single_word():
    assert arrange_words("Hello") == "Hello"


def test_arrange_words_one_letter_word_moves_first():
    assert arrange_words("Jump a") == "A jump"
