from solution import valid_word_abbreviation


def test_valid_word_abbreviation_long_word():
    assert valid_word_abbreviation("internationalization", "i12iz4n") is True


def test_valid_word_abbreviation_length_mismatch():
    assert valid_word_abbreviation("apple", "a2e") is False


def test_valid_word_abbreviation_leading_zero():
    assert valid_word_abbreviation("substitution", "s010n") is False
    assert valid_word_abbreviation("a", "01") is False


def test_valid_word_abbreviation_whole_word_as_number():
    assert valid_word_abbreviation("word", "4") is True
    assert valid_word_abbreviation("word", "5") is False


def test_valid_word_abbreviation_many_gaps():
    assert valid_word_abbreviation("substitution", "su3i1u2on") is True


def test_valid_word_abbreviation_unabbreviated():
    assert valid_word_abbreviation("hi", "hi") is True
    assert valid_word_abbreviation("hi", "2i") is False
