from solution import least_ops_express_target


def test_least_ops_express_target_example_one():
    assert least_ops_express_target(3, 19) == 5


def test_least_ops_express_target_example_two():
    assert least_ops_express_target(5, 501) == 8


def test_least_ops_express_target_power_of_x():
    assert least_ops_express_target(100, 100000000) == 3


def test_least_ops_express_target_equals_x():
    assert least_ops_express_target(3, 3) == 0


def test_least_ops_express_target_one():
    assert least_ops_express_target(2, 1) == 1


def test_least_ops_express_target_subtract_is_cheaper():
    assert least_ops_express_target(3, 2) == 2
