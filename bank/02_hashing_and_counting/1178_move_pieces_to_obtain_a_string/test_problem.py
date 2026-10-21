from solution import can_change


def test_can_change_example_one():
    assert can_change("_L__R__R_", "L______RR") is True


def test_can_change_example_two():
    assert can_change("R_L_", "__LR") is False


def test_can_change_example_three():
    assert can_change("_R", "R_") is False


def test_can_change_identical():
    assert can_change("L_R", "L_R") is True


def test_can_change_all_blanks():
    assert can_change("___", "___") is True
