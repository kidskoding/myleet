from solution import walls_and_gates


def test_walls_and_gates_normal_case():
    inf = 2**31 - 1
    rooms = [
        [inf, -1, 0, inf],
        [inf, inf, inf, -1],
        [inf, -1, inf, -1],
        [0, -1, inf, inf],
    ]
    expected = [
        [3, -1, 0, 1],
        [2, 2, 1, -1],
        [1, -1, 2, -1],
        [0, -1, 3, 4],
    ]

    walls_and_gates(rooms)

    assert rooms == expected


def test_walls_and_gates_no_gates():
    inf = 2**31 - 1
    rooms = [[inf, inf], [inf, inf]]

    walls_and_gates(rooms)

    assert rooms == [[inf, inf], [inf, inf]]
