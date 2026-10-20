from solution import MyLinkedList


def test_my_linked_list_add_and_get():
    linked_list = MyLinkedList()
    linked_list.add_at_head(1)
    linked_list.add_at_tail(3)
    linked_list.add_at_index(1, 2)

    assert linked_list.get(1) == 2


def test_my_linked_list_delete_shifts_indices():
    linked_list = MyLinkedList()
    linked_list.add_at_head(1)
    linked_list.add_at_tail(3)
    linked_list.add_at_index(1, 2)
    linked_list.delete_at_index(1)

    assert linked_list.get(1) == 3


def test_my_linked_list_get_out_of_range():
    linked_list = MyLinkedList()
    linked_list.add_at_head(1)

    assert linked_list.get(5) == -1
