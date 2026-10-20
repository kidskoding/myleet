from solution import can_transform


def test_can_transform_example():
    assert can_transform("RXXLRXRXL", "XRLXXRRLX") is True


def test_can_transform_different_letters():
    assert can_transform("X", "L") is False


def test_can_transform_l_moves_left_only():
    assert can_transform("XL", "LX") is True
    assert can_transform("LX", "XL") is False


def test_can_transform_r_moves_right_only():
    assert can_transform("RX", "XR") is True
    assert can_transform("XR", "RX") is False


def test_can_transform_letters_cannot_cross():
    assert can_transform("RL", "LR") is False


def test_can_transform_identical():
    assert can_transform("XLRX", "XLRX") is True
