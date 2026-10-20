from solution import total_hamming_distance


def test_total_hamming_distance_normal():
    assert total_hamming_distance([4, 14, 2]) == 6


def test_total_hamming_distance_single_element():
    assert total_hamming_distance([5]) == 0


def test_total_hamming_distance_identical_values():
    assert total_hamming_distance([7, 7, 7]) == 0
