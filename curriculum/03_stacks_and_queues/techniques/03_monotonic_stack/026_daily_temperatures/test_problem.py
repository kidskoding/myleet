from solution import daily_temperatures


def test_daily_temperatures_normal_case():
    assert daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]) == [
        1,
        1,
        4,
        2,
        1,
        1,
        0,
        0,
    ]


def test_daily_temperatures_empty():
    assert daily_temperatures([]) == []


def test_daily_temperatures_single_element():
    assert daily_temperatures([50]) == [0]


def test_daily_temperatures_strictly_decreasing():
    assert daily_temperatures([80, 70, 60]) == [0, 0, 0]
