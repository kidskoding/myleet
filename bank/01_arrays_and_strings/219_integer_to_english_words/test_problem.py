from solution import number_to_words


def test_number_to_words_zero():
    assert number_to_words(0) == "Zero"


def test_number_to_words_hundreds():
    assert number_to_words(123) == "One Hundred Twenty Three"
    assert number_to_words(100) == "One Hundred"


def test_number_to_words_thousands():
    assert number_to_words(12345) == "Twelve Thousand Three Hundred Forty Five"


def test_number_to_words_millions():
    expected = "One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven"
    assert number_to_words(1234567) == expected


def test_number_to_words_skips_zero_chunks():
    assert number_to_words(1000010) == "One Million Ten"
    assert number_to_words(1000000000) == "One Billion"


def test_number_to_words_teens_and_max():
    assert number_to_words(19) == "Nineteen"
    expected = "Two Billion One Hundred Forty Seven Million Four Hundred Eighty Three Thousand Six Hundred Forty Seven"
    assert number_to_words(2147483647) == expected
