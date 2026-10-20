from solution import num_decodings


def test_num_decodings_empty():
    assert num_decodings("") == 0


def test_num_decodings_single_digit():
    assert num_decodings("2") == 1


def test_num_decodings_normal():
    assert num_decodings("12") == 2


def test_num_decodings_with_zero():
    assert num_decodings("06") == 0


def test_num_decodings_leading_invalid():
    assert num_decodings("0") == 0
