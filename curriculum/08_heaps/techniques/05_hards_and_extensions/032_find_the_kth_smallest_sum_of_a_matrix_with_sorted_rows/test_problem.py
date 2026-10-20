from solution import kth_smallest_matrix_sum


def test_kth_smallest_matrix_sum_normal():
    assert kth_smallest_matrix_sum([[1, 3, 11], [2, 4, 6]], 5) == 7


def test_kth_smallest_matrix_sum_last():
    assert kth_smallest_matrix_sum([[1, 3, 11], [2, 4, 6]], 9) == 17
