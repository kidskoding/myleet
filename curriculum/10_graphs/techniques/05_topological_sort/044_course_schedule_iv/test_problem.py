from solution import check_if_prerequisite


def test_check_if_prerequisite_normal_case():
    result = check_if_prerequisite(
        5,
        [[0, 1], [1, 2], [2, 3], [3, 4]],
        [[0, 4], [4, 0], [1, 3], [3, 0]],
    )

    assert result == [True, False, True, False]


def test_check_if_prerequisite_direct_edge():
    assert check_if_prerequisite(2, [[1, 0]], [[0, 1], [1, 0]]) == [False, True]


def test_check_if_prerequisite_no_edges():
    assert check_if_prerequisite(2, [], [[1, 0], [0, 1]]) == [False, False]


def test_check_if_prerequisite_transitive():
    prereqs = [[0, 1], [1, 2], [2, 3], [3, 4]]
    assert check_if_prerequisite(5, prereqs, [[0, 4], [4, 0]]) == [True, False]
