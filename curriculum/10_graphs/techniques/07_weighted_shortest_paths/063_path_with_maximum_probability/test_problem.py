from solution import max_probability


def test_max_probability_normal_case():
    edges = [[0, 1], [1, 2], [0, 2]]
    succ_prob = [0.5, 0.5, 0.2]

    assert max_probability(3, edges, succ_prob, 0, 2) == 0.25


def test_max_probability_no_path():
    assert max_probability(3, [[0, 1]], [0.5], 0, 2) == 0.0
