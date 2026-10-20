from solution import find_high_access_employees


def test_find_high_access_employees_example_one():
    times = [["a", "0549"], ["b", "0457"], ["a", "0532"], ["a", "0621"], ["b", "0540"]]
    assert sorted(find_high_access_employees(times)) == ["a"]


def test_find_high_access_employees_example_two():
    times = [
        ["d", "0002"],
        ["c", "0808"],
        ["c", "0829"],
        ["e", "0215"],
        ["d", "1508"],
        ["d", "1444"],
        ["d", "1410"],
        ["c", "0809"],
    ]
    assert sorted(find_high_access_employees(times)) == ["c", "d"]


def test_find_high_access_employees_example_three():
    times = [["cd", "1025"], ["ab", "1025"], ["cd", "1046"], ["cd", "1055"], ["ab", "1124"], ["ab", "1120"]]
    assert sorted(find_high_access_employees(times)) == ["ab", "cd"]


def test_find_high_access_employees_exactly_one_hour_excluded():
    assert find_high_access_employees([["a", "0815"], ["a", "0845"], ["a", "0915"]]) == []


def test_find_high_access_employees_same_minute():
    assert find_high_access_employees([["a", "0000"], ["a", "0000"], ["a", "0000"]]) == ["a"]


def test_find_high_access_employees_no_wraparound():
    assert find_high_access_employees([["a", "0005"], ["a", "2350"], ["a", "2359"]]) == []
