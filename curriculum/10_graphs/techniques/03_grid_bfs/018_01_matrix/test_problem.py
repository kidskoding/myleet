from solution import update_matrix


def test_update_matrix_normal_case():
    assert update_matrix([[0, 0, 0], [0, 1, 0], [0, 0, 0]]) == [
        [0, 0, 0],
        [0, 1, 0],
        [0, 0, 0],
    ]


def test_update_matrix_single_one():
    assert update_matrix([[0, 0, 0], [0, 1, 0], [1, 1, 1]]) == [
        [0, 0, 0],
        [0, 1, 0],
        [1, 2, 1],
    ]
