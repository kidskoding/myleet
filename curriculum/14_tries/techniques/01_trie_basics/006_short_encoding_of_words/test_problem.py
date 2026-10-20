from solution import minimum_length_encoding


def test_minimum_length_encoding_shares_suffixes():
    assert minimum_length_encoding(["time", "me", "bell"]) == 10


def test_minimum_length_encoding_single_word():
    assert minimum_length_encoding(["t"]) == 2
