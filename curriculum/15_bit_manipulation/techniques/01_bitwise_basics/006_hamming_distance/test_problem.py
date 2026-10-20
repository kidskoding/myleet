from solution import hamming_distance


def test_hamming_distance_normal():
    assert hamming_distance(1, 4) == 2


def test_hamming_distance_one_bit():
    assert hamming_distance(3, 1) == 1
