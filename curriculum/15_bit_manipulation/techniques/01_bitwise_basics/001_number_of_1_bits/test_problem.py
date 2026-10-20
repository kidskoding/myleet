from solution import hamming_weight


def test_hamming_weight_zero():
    assert hamming_weight(0) == 0


def test_hamming_weight_single_bit():
    assert hamming_weight(1) == 1


def test_hamming_weight_normal():
    assert hamming_weight(11) == 3


def test_hamming_weight_all_ones_byte():
    assert hamming_weight(255) == 8
