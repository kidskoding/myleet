from solution import gray_code


def test_gray_code_two_bits():
    assert gray_code(2) == [0, 1, 3, 2]


def test_gray_code_one_bit():
    assert gray_code(1) == [0, 1]
