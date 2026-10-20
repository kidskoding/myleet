from solution import num_enclaves


def test_num_enclaves_normal_case():
    grid = [[0, 0, 0, 0], [1, 0, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]]

    assert num_enclaves(grid) == 3


def test_num_enclaves_no_land():
    assert num_enclaves([[0, 0], [0, 0]]) == 0
