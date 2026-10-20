from solution import min_number_of_frogs


def test_min_number_of_frogs_sequential():
    assert min_number_of_frogs("croakcroak") == 1


def test_min_number_of_frogs_interleaved():
    assert min_number_of_frogs("crcoakroak") == 2


def test_min_number_of_frogs_invalid():
    assert min_number_of_frogs("croakcrook") == -1


def test_min_number_of_frogs_unfinished():
    assert min_number_of_frogs("c") == -1


def test_min_number_of_frogs_fully_parallel():
    assert min_number_of_frogs("ccrrooaakk") == 2


def test_min_number_of_frogs_letter_out_of_order():
    assert min_number_of_frogs("rcoak") == -1
