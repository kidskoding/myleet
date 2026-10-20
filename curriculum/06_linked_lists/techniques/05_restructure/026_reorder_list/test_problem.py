from list_node import ListNode
from solution import reorder_list


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_reorder_list_even():
    head = build_list([1, 2, 3, 4])
    reorder_list(head)
    assert to_list(head) == [1, 4, 2, 3]


def test_reorder_list_odd():
    head = build_list([1, 2, 3, 4, 5])
    reorder_list(head)
    assert to_list(head) == [1, 5, 2, 4, 3]
