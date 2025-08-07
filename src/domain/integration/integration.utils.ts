import {
  type AmoCustomField,
  editLeadsByIdCustomFieldsValueRequest,
  editLeadsByIdVarsValueRequest,
} from 'src/external/amo-crm/amo-crm.dto';

export class IntegrationUtils {
  /**
   * Заменяет переменные в строке на соответствующие значения из объекта `vars`.
   *
   * @param str - Исходная строка, содержащая переменные.
   * @param vars - Объект, в котором ключи соответствуют именам переменных, а значения — их значениям.
   * @returns Строка с подставленными значениями переменных.
   */
  private replaceVariables(str: string, vars: { [x: string]: any }): string {
    return str.replace(/%(\w+)%/g, (match, p1) => {
      // если значение определено (в том числе null/false/0), используем его,
      // иначе — строку "null"
      return vars[p1] !== undefined ? vars[p1] : 'null';
    });
  }

  /**
   * Заменяет числовые идентификаторы в строке (например, %123%) на значения из customFields.
   *
   * Если идентификатор окружён знаками `%`, они сохраняются, если замена не найдена.
   *
   * @param str - Строка, содержащая идентификаторы.
   * @param customFields - Объект с кастомными полями amoCRM, где ключ — ID поля.
   * @returns Строка с заменёнными значениями или оригинальными идентификаторами.
   */
  private replaceIdsWithValues(str: string, customFields: { [key: string]: AmoCustomField }): string {
    const idRegex = /%?(\d+)%?/g;

    return str.replace(idRegex, (match: string, id: string) => {
      const fieldId = parseInt(id, 10);
      const field = Object.values(customFields).find(field => field.field_id === fieldId);

      if (field?.values?.[0]?.value) {
        return field.values[0].value;
      }

      return match;
    });
  }

  /**
   * Преобразует переменные из Senler в значения полей amoCRM, используя сопоставление переменных.
   *
   * @param syncableVariables - Объект, где ключи — переменные, а значения содержат `from` и `to` id переменных в системах.
   * @param senlerLeadVars - Объект с переменными лида из Senler.
   * @returns Массив объектов, представляющих значения кастомных полей amoCRM.
   */
  public convertSenlerVarsToAmoFields(syncableVariables, senlerLeadVars) {
    const customFieldsValues: editLeadsByIdCustomFieldsValueRequest[] = [];

    for (const key in syncableVariables) {
      const fromValue = syncableVariables[key].from;
      const toValue = syncableVariables[key].to;

      const field_id = this.replaceVariables(toValue, senlerLeadVars);
      const value = this.replaceVariables(fromValue, senlerLeadVars);

      customFieldsValues.push({
        field_id: +field_id,
        values: [{ value: this.truncateGrapheme(value.toString()) || 'null' }],
      });
    }

    return customFieldsValues;
  }

  /**
   * Преобразует кастомные поля amoCRM обратно в переменные Senler по заданному соответствию.
   *
   * @param syncableVariables - Объект с сопоставлением переменных.
   * @param amoLeadCustomFieldValues - Объект с кастомными полями лида из amoCRM.
   * @returns Объект с переменными и их значениями для передачи в Senler.
   */
  public convertAmoFieldsToSenlerVars(syncableVariables, amoLeadCustomFieldValues) {
    const customFieldsValues: editLeadsByIdVarsValueRequest = { vars: [], glob_vars: [] };

    for (const key in syncableVariables) {
      const fromValue = syncableVariables[key].from;
      const toValue = syncableVariables[key].to;

      const field_name = toValue;

      const value = this.replaceIdsWithValues(fromValue, amoLeadCustomFieldValues);

      customFieldsValues.vars.push({
        n: field_name,
        v: value,
      });
    }

    return customFieldsValues;
  }

  private truncateGrapheme(str, maxLength = 2000) {
    const graphemes = Array.from(str); // разбиваем на кодовые точки
    return graphemes.length <= maxLength ? str : graphemes.slice(0, maxLength).join('');
  }
}
