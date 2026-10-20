from solution import count_valid_words


def test_count_valid_words_example_simple():
    assert count_valid_words("cat and  dog") == 3


def test_count_valid_words_example_all_invalid():
    assert count_valid_words("!this  1-s b8d!") == 0


def test_count_valid_words_example_digit_suffix():
    assert count_valid_words("alice and  bob are playing stone-game10") == 5


def test_count_valid_words_valid_forms():
    assert count_valid_words("a-b. afad ba-c a! !") == 5


def test_count_valid_words_bad_hyphens_and_punctuation():
    assert count_valid_words("-ab ab- a-b-c a!b c., a-!") == 0


def test_count_valid_words_surrounding_spaces():
    assert count_valid_words("   hello   ") == 1
