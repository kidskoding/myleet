from solution import num_decodings


def test_num_decodings_single_star():
    assert num_decodings("*") == 9


def test_num_decodings_one_then_star():
    assert num_decodings("1*") == 18


def test_num_decodings_two_then_star():
    assert num_decodings("2*") == 15


def test_num_decodings_zero_alone():
    assert num_decodings("0") == 0


def test_num_decodings_double_star_and_star_zero():
    assert num_decodings("**") == 96
    assert num_decodings("*0") == 2


def test_num_decodings_plain_digits():
    assert num_decodings("12") == 2
    assert num_decodings("3*") == 9
