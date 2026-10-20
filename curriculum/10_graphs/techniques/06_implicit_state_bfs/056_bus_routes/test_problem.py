from solution import num_buses_to_destination


def test_num_buses_to_destination_normal_case():
    routes = [[1, 2, 7], [3, 6, 7]]

    assert num_buses_to_destination(routes, 1, 6) == 2


def test_num_buses_to_destination_same_start_and_target():
    assert num_buses_to_destination([[1, 2, 7]], 1, 1) == 0
