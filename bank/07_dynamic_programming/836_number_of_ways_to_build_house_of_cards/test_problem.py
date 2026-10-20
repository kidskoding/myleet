from solution import house_of_cards


def test_house_of_cards_example_sixteen():
    assert house_of_cards(16) == 2


def test_house_of_cards_example_two():
    assert house_of_cards(2) == 1


def test_house_of_cards_example_four():
    assert house_of_cards(4) == 0


def test_house_of_cards_one_card():
    assert house_of_cards(1) == 0


def test_house_of_cards_two_rows():
    assert house_of_cards(7) == 1


def test_house_of_cards_thirty():
    assert house_of_cards(30) == 5
