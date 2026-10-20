from solution import Employee, get_importance


def test_get_importance_with_subordinates():
    employees = [
        Employee(1, 5, [2, 3]),
        Employee(2, 3, []),
        Employee(3, 3, []),
    ]

    assert get_importance(employees, 1) == 11


def test_get_importance_leaf_employee():
    employees = [Employee(1, 5, [2, 3]), Employee(2, 3, []), Employee(3, 3, [])]

    assert get_importance(employees, 2) == 3
