from solution import to_hexspeak


def test_to_hexspeak_zeros_and_ones():
    assert to_hexspeak("257") == "IOI"


def test_to_hexspeak_plain_digit_is_error():
    assert to_hexspeak("3") == "ERROR"


def test_to_hexspeak_long_number():
    assert to_hexspeak("747823223228") == "AEIDBCDIBC"


def test_to_hexspeak_all_ones():
    assert to_hexspeak("4369") == "IIII"


def test_to_hexspeak_letters_only():
    assert to_hexspeak("255") == "FF"


def test_to_hexspeak_error_hidden_in_middle():
    assert to_hexspeak("6699") == "ERROR"


def test_to_hexspeak_upper_limit():
    assert to_hexspeak("1000000000000") == "ERROR"
