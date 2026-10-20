from solution import two_city_sched_cost


def test_two_city_sched_cost_normal():
    assert two_city_sched_cost([[10, 20], [30, 200], [400, 50], [30, 20]]) == 110


def test_two_city_sched_cost_six_people():
    costs = [[259, 770], [448, 54], [926, 667], [184, 139], [840, 118], [577, 469]]
    assert two_city_sched_cost(costs) == 1859
